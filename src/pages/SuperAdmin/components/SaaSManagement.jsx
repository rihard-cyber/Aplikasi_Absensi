import React, { useState, useEffect, useRef } from 'react';
import { Power, Crown, Building, Eye, ArrowUp, ChevronDown, ChevronUp, RefreshCcw, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSFX } from '../../../utils/useSFX';

const tenantsData = [
  { id: 1, name: 'Tenant Company Alpha', tier: 'Enterprise', users: 1250, maxUsers: 2000, daysLeft: 280, active: true },
  { id: 2, name: 'Tenant Company Beta', tier: 'Enterprise', users: 4500, maxUsers: 5000, daysLeft: 45, active: true },
  { id: 3, name: 'Startup Inc.', tier: 'Bronze', users: 45, maxUsers: 100, daysLeft: 8, active: false },
  { id: 4, name: 'PT. Provices Project', tier: 'Gold', users: 320, maxUsers: 500, daysLeft: 120, active: true },
  { id: 5, name: 'CV. Maju Jaya', tier: 'Silver', users: 89, maxUsers: 200, daysLeft: 60, active: true },
];

const HealthBar = ({ value, max, colorClass }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
};

const SkeletonRow = () => (
  <div className="bg-[#1A1C23] border border-white/5 rounded-2xl p-4 flex gap-4 items-center animate-pulse">
    <div className="w-11 h-11 rounded-xl bg-white/10 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2 bg-white/5 rounded w-1/2" />
      <div className="h-1.5 bg-white/5 rounded w-full mt-1" />
    </div>
    <div className="flex gap-2 flex-shrink-0">
      <div className="w-10 h-10 rounded-xl bg-white/10" />
      <div className="w-10 h-10 rounded-xl bg-white/10" />
    </div>
  </div>
);

const SaaSManagement = ({ onImpersonate, searchQuery = '' }) => {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [killConfirm, setKillConfirm] = useState(null); // id of tenant awaiting confirm
  const [killCountdown, setKillCountdown] = useState(3);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef(null);
  const { playClick, playAlert, playConfirm } = useSFX();

  useEffect(() => {
    // Simulate data loading
    const t = setTimeout(() => { setTenants(tenantsData); setIsLoading(false); }, 800);
    return () => clearTimeout(t);
  }, []);

  // Kill countdown timer
  useEffect(() => {
    if (killConfirm === null) return;
    setKillCountdown(3);
    const interval = setInterval(() => {
      setKillCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [killConfirm]);

  const initiateKill = (id) => {
    setKillConfirm(id);
    playAlert();
  };

  const confirmKill = (id) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
    setKillConfirm(null);
    playConfirm();
  };

  const cancelKill = () => { setKillConfirm(null); playClick(); };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
    playClick();
  };

  const handleScroll = () => {
    if (scrollRef.current) setShowBackToTop(scrollRef.current.scrollTop > 100);
  };

  const scrollToTop = () => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); playClick(); };

  const filteredTenants = tenants.filter(t =>
    searchQuery === '' || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.tier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserColor = (used, max) => {
    const pct = used / max;
    if (pct >= 0.9) return 'bg-[var(--danger)] shadow-[0_0_8px_var(--danger)]';
    if (pct >= 0.7) return 'bg-[var(--warning)]';
    return 'bg-[var(--success)]';
  };

  const getDaysColor = (days) => {
    if (days <= 14) return 'bg-[var(--danger)]';
    if (days <= 60) return 'bg-[var(--warning)]';
    return 'bg-[var(--success)]';
  };

  return (
    <div className="flex flex-col gap-3 relative">
      {/* Sticky Header */}
      <div className="flex items-center justify-between sticky top-0 bg-[#0B0C10]/90 backdrop-blur-md py-2 z-10 border-b border-white/5 mb-1">
        <p className="text-xs text-gray-500 uppercase tracking-widest">{filteredTenants.length} tenant</p>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">Klik baris untuk aksi cepat</span>
      </div>

      {/* Scrollable List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar"
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          <AnimatePresence>
            {filteredTenants.map((tenant) => {
              const userPct = Math.round((tenant.users / tenant.maxUsers) * 100);
              const daysPct = Math.min(100, Math.round((tenant.daysLeft / 365) * 100));
              const isExpanded = expandedId === tenant.id;
              const isPendingKill = killConfirm === tenant.id;

              return (
                <motion.div
                  key={tenant.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    tenant.active
                      ? 'bg-[#1A1C23] border-white/5 hover:border-[var(--aurora-3)]/40 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(0,201,255,0.08)]'
                      : 'bg-[var(--danger)]/5 border-[var(--danger)]/30'
                  }`}
                >
                  {/* Main Row */}
                  <div
                    className="p-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpand(tenant.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${tenant.active ? 'bg-[var(--aurora-3)]/10 text-[var(--aurora-3)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                        <Building size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-[14px] text-white tracking-wide truncate">{tenant.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-[var(--warning)]">
                            <Crown size={10} /> {tenant.tier}
                          </span>
                          <span className="text-[10px] text-gray-500">• {tenant.users.toLocaleString()}/{tenant.maxUsers.toLocaleString()} usr</span>
                          <span className={`text-[10px] font-bold ${tenant.daysLeft <= 14 ? 'text-[var(--danger)]' : tenant.daysLeft <= 60 ? 'text-[var(--warning)]' : 'text-gray-500'}`}>
                            • {tenant.daysLeft}h lagi
                          </span>
                        </div>
                        {/* Health Bars */}
                        <div className="mt-2 space-y-1">
                          <HealthBar value={tenant.users} max={tenant.maxUsers} colorClass={getUserColor(tenant.users, tenant.maxUsers)} />
                          <HealthBar value={tenant.daysLeft} max={365} colorClass={getDaysColor(tenant.daysLeft)} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expandable Quick Actions */}
                  <AnimatePresence>
                    {isExpanded && !isPendingKill && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-white/5 overflow-hidden"
                      >
                        <div className="p-4 flex flex-wrap gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onImpersonate && onImpersonate('TENANT_ADMIN'); playClick(); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] border border-[var(--aurora-1)]/30 hover:bg-[var(--aurora-1)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <Eye size={14} /> Impersonate
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); playClick(); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 hover:bg-[var(--success)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <RefreshCcw size={14} /> Perpanjang Lisensi
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); playClick(); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] border border-[var(--aurora-3)]/30 hover:bg-[var(--aurora-3)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <Shield size={14} /> Reset Keamanan
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); initiateKill(tenant.id); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)] hover:text-white text-xs font-bold tracking-wide transition-all ml-auto"
                          >
                            <Power size={14} /> {tenant.active ? 'Matikan Akses' : 'Aktifkan'}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Double Confirmation Kill Switch Panel */}
                    {isPendingKill && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border-t border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[var(--danger)] font-bold text-sm tracking-wide">⚠ KONFIRMASI TINDAKAN BERBAHAYA</p>
                            <p className="text-gray-400 text-xs mt-0.5">Ini akan {tenant.active ? 'menonaktifkan' : 'mengaktifkan'} akses <span className="text-white font-bold">{tenant.name}</span>.</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={cancelKill}
                              className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 text-xs font-bold transition-all"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => confirmKill(tenant.id)}
                              disabled={killCountdown > 0}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                                killCountdown > 0
                                  ? 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                                  : 'bg-[var(--danger)] text-white border-[var(--danger)] hover:bg-red-700 shadow-[0_0_20px_rgba(255,0,85,0.5)] animate-pulse'
                              }`}
                            >
                              <Power size={12} />
                              {killCountdown > 0 ? `Tunggu (${killCountdown}s)` : 'YA, LANJUTKAN'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!isLoading && filteredTenants.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">Tidak ada tenant yang cocok.</div>
        )}
      </div>

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)]/40 flex items-center justify-center text-[var(--aurora-3)] shadow-[0_0_15px_rgba(0,201,255,0.4)] animate-pulse"
          >
            <ArrowUp size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SaaSManagement;
