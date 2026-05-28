import React, { useState, useEffect, useRef } from 'react';
import { Power, Crown, Building, Eye, ArrowUp, ChevronDown, ChevronUp, RefreshCcw, Shield, Plus, X, Globe, UserPlus, Phone, MapPin, Loader2, Copy, Star, CheckCircle2, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSFX } from '../../../utils/useSFX';
import { supabase } from '../../../utils/supabaseClient';
import { copyToClipboard } from '../../../utils/clipboardUtil';
import { useConfirm } from '../../../components/ConfirmDialog';

const tenantsData = [
  { id: 1, name: 'Tenant Company Alpha', tier: 'Enterprise', users: 1250, maxUsers: 2000, daysLeft: 280, active: true },
  { id: 2, name: 'Tenant Company Beta', tier: 'Enterprise', users: 4500, maxUsers: 5000, daysLeft: 45, active: true },
  { id: 3, name: 'Startup Inc.', tier: 'Bronze', users: 45, maxUsers: 100, daysLeft: 8, active: false },
  { id: 4, name: 'PT. Provices Project', tier: 'Gold', users: 320, maxUsers: 500, daysLeft: 120, active: true },
  { id: 5, name: 'CV. Maju Jaya', tier: 'Silver', users: 89, maxUsers: 200, daysLeft: 60, active: true },
];

const randomCodeSegment = (length = 4) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => chars[byte % chars.length]).join('');
};

const makeActivationCode = (prefix) => `${prefix}-${randomCodeSegment()}-${randomCodeSegment()}`;

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
  const [fetchError, setFetchError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', tier: 'Bronze', maxUsers: 100, daysLeft: 365 });
  const [generatedCode, setGeneratedCode] = useState('');      // Kode Karyawan
  const [generatedAdminCode, setGeneratedAdminCode] = useState(''); // Kode Admin Tenant
  const [isCreating, setIsCreating] = useState(false);
  const [killConfirm, setKillConfirm] = useState(null); // id of tenant awaiting confirm
  const [killCountdown, setKillCountdown] = useState(3);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef(null);
  const { playClick, playAlert, playConfirm } = useSFX();
  const confirm = useConfirm();

  useEffect(() => {
    fetchTenants();
  }, []);

  const generateCode = () => {
    setGeneratedCode(makeActivationCode('SI'));
    setGeneratedAdminCode(makeActivationCode('ADM'));
    playConfirm();
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!generatedCode || !generatedAdminCode) { alert("Generate kode aktivasi dulu beb!"); return; }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.from('tenants').insert([{
        name: newTenant.name,
        tier: newTenant.tier,
        max_users: parseInt(newTenant.maxUsers),
        days_left: parseInt(newTenant.daysLeft),
        activation_code: generatedCode,
        admin_code: generatedAdminCode,
        is_active: true
      }]).select();

      if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message);
      }
      
      const t = data[0];
      const newEntry = { 
        id: t.id, name: t.name, tier: t.tier || 'Bronze', 
        users: 0, maxUsers: t.max_users, daysLeft: t.days_left, 
        active: t.is_active, 
        activationCode: t.activation_code,
        adminCode: t.admin_code
      };
      setTenants(prev => [newEntry, ...prev]);
      setShowCreateModal(false);
      setNewTenant({ name: '', tier: 'Bronze', maxUsers: 100, daysLeft: 365 });
      setGeneratedCode('');
      setGeneratedAdminCode('');
      alert(`Sukses Beb! Tenant ${newTenant.name} aktif.\n\nKode Admin Tenant: ${generatedAdminCode}\nKode Karyawan: ${generatedCode}`);
    } catch (err) {
      console.error("HandleCreate Error:", err);
      if (err.message === 'Failed to fetch') {
        alert("Gagal aktifkan tenant: Koneksi ke database terputus.\n\n" +
              "Penyebab: Supabase project sedang sleep/tidur.\n" +
              "Solusi: Buka https://supabase.com/dashboard,\n" +
              "klik project 'bhauqlobuiuavaoeoawc', lalu klik RESTORE.\n\n" +
              "Atau pastikan koneksi internet kamu aktif.");
      } else {
        alert("Gagal aktifkan tenant: " + (err.message || "Masalah koneksi database"));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, tier, is_active, days_left, max_users, activation_code, admin_code, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch error details:", error);
        throw error;
      }

      if (data && data.length > 0) {
        const formatted = data.map(t => ({
          id: t.id, 
          name: t.name, 
          tier: t.tier || 'Standard',
          users: t.current_users || 0,
          maxUsers: t.max_users || 100, 
          daysLeft: t.days_left || 365, 
          active: t.is_active ?? true,
          activationCode: t.activation_code,
          adminCode: t.admin_code
        }));
        setTenants(formatted);
      }
    } catch (err) {
      console.error("Fetch tenants error:", err);
      setFetchError(err.message || 'Koneksi gagal');
    } finally {
      setIsLoading(false);
    }
  };

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

  const confirmKill = async (id) => {
    const tenant = tenants.find(t => t.id === id);
    if (tenant) {
      const newStatus = !tenant.active;
      try {
        // 1. Update status di Supabase
        await supabase.from('tenants').update({ is_active: newStatus }).eq('id', id);

        // 2. Simpan jejak di Audit Trail
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action: newStatus ? 'ACTIVATE_TENANT' : 'DEACTIVATE_TENANT',
            details: `Akses SaaS untuk ${tenant.name} telah ${newStatus ? 'diaktifkan' : 'dimatikan'}.`
          });
        }
        setTenants(prev => prev.map(t => t.id === id ? { ...t, active: newStatus } : t));
      } catch (e) {
        console.error("Gagal mengubah status tenant", e);
        alert("Terjadi kesalahan jaringan.");
      }
    }
    setKillConfirm(null);
    playConfirm();
  };

  const handleExtendLicense = async (id, currentDays, name) => {
    try {
      const newDays = currentDays + 365;
      await supabase.from('tenants').update({ days_left: newDays }).eq('id', id);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('audit_logs').insert({
          user_id: session.user.id,
          action: 'EXTEND_LICENSE',
          details: `Lisensi ${name} diperpanjang 365 hari.`
        });
      }
      setTenants(prev => prev.map(t => t.id === id ? { ...t, daysLeft: newDays } : t));
      alert(`Sukses! Lisensi ${name} berhasil diperpanjang 1 tahun.`);
      playConfirm();
    } catch (e) {
      console.error("Gagal perpanjang lisensi", e);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleResetSecurity = async (id, name) => {
    const ok = await confirm(`Reset keamanan ${name}? Ini akan membuat kode lisensi lama menjadi hangus.`, 'Reset Keamanan');
    if (!ok) return;
    try {
      const newEmpCode = makeActivationCode('SI');
      await supabase.from('tenants').update({ activation_code: newEmpCode }).eq('id', id);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, activationCode: newEmpCode } : t));
      alert(`Keamanan direset! Kode Karyawan baru untuk ${name} adalah:\n${newEmpCode}`);
      playConfirm();
    } catch (e) {
      console.error("Gagal reset keamanan", e);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleGenerateLicenseCode = async (id, name) => {
    try {
      const newLicCode = makeActivationCode('ADM');

      // Coba simpan ke admin_code (kolom baru) dulu
      const { error: adminCodeErr } = await supabase.from('tenants').update({ admin_code: newLicCode }).eq('id', id);

      // Jika kolom admin_code belum ada, simpan ke activation_code sebagai fallback
      if (adminCodeErr) {
        console.warn('admin_code kolom belum tersedia, fallback ke activation_code:', adminCodeErr.message);
        const { error: fallbackErr } = await supabase.from('tenants').update({ activation_code: newLicCode }).eq('id', id);
        if (fallbackErr) throw fallbackErr;
      }

      setTenants(prev => prev.map(t => t.id === id ? { ...t, adminCode: newLicCode, activationCode: adminCodeErr ? newLicCode : t.activationCode } : t));
      copyToClipboard(newLicCode);
      alert(`✅ Kode Lisensi berhasil di-generate untuk ${name}:\n\n${newLicCode}\n\n(Kode sudah disalin ke clipboard)\n\nBerikan kode ini ke Admin Tenant untuk mendaftar.`);
      playConfirm();
    } catch (e) {
      console.error("Gagal generate kode lisensi", e);
      alert("Terjadi kesalahan: " + e.message);
    }
  };

  const handleImpersonate = (tenant) => {
    try { localStorage.setItem('impersonated_tenant', JSON.stringify(tenant)); } catch {}
    alert(`[GOD MODE: ON]\nSedang mengambil alih panel admin ${tenant.name}...`);
    playClick();
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
    <div className="flex flex-col gap-4 relative h-full">
      {/* Sticky Header */}
      <div className="flex items-center justify-between sticky top-0 bg-[#0B0C10]/95 backdrop-blur-xl py-4 z-[30] border-b border-white/10 mb-2">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Building size={16} className="text-[var(--aurora-1)]" /> Manajemen Unit SaaS
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{filteredTenants.length} Entitas Terdeteksi</p>
        </div>
        <button 
          onClick={() => { setShowCreateModal(true); playClick(); }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-3)] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(142,45,226,0.4)] hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={14} strokeWidth={3} /> TAMBAH TENANT
        </button>
      </div>

      {/* Scrollable List container */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll} 
        className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-10"
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
                  className={`rounded-2xl border overflow-hidden transition-all ${tenant.active
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

                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-2">
                      {/* Dual Code Display - Desktop only */}
                      <div className="hidden md:flex flex-col gap-1 px-2 sm:px-3 border-l border-white/5 mr-1 sm:mr-2">
                        {/* Admin / Lisensi Code */}
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[7px] sm:text-[8px] text-[var(--warning)] font-black uppercase tracking-widest">Lisensi</span>
                          {tenant.adminCode ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(tenant.adminCode || '');
                                setCopiedId('adm-' + tenant.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
              className={`text-[8px] sm:text-[10px] font-mono px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-all flex items-center gap-1 ${
                                 copiedId === 'adm-' + tenant.id 
                                   ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30' 
                                   : 'text-[var(--warning)] bg-[var(--warning)]/[0.05] border border-[var(--warning)]/20 hover:bg-[var(--warning)]/20'
                               }`}
                            >
                              {copiedId === 'adm-' + tenant.id ? 'OK!' : tenant.adminCode}
                              {copiedId === 'adm-' + tenant.id ? <CheckCircle2 size={8} /> : <Copy size={8} className="text-gray-600" />}
                            </button>
                          ) : (
                            <span className="text-[8px] font-mono text-gray-600 italic">-</span>
                          )}
                        </div>
                        {/* Employee Code */}
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[7px] sm:text-[8px] text-gray-600 font-black uppercase tracking-widest">Karyawan</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(tenant.activationCode || '');
                              setCopiedId('emp-' + tenant.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
              className={`text-[8px] sm:text-[10px] font-mono px-2 sm:px-3 py-1.5 sm:py-2 rounded transition-all flex items-center gap-1 ${
                                 copiedId === 'emp-' + tenant.id 
                                   ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30' 
                                   : 'text-[var(--aurora-3)] bg-[var(--aurora-3)]/[0.05] border border-[var(--aurora-3)]/20 hover:bg-[var(--aurora-3)]/20'
                               }`}
                          >
                            {copiedId === 'emp-' + tenant.id ? 'OK!' : (tenant.activationCode || '----')}
                            {copiedId === 'emp-' + tenant.id ? <CheckCircle2 size={8} /> : <Copy size={8} className="text-gray-600" />}
                          </button>
                        </div>
                      </div>
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
                            onClick={(e) => { e.stopPropagation(); handleImpersonate(tenant); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--aurora-1)]/10 text-[var(--aurora-1)] border border-[var(--aurora-1)]/30 hover:bg-[var(--aurora-1)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <Eye size={14} /> Impersonate
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExtendLicense(tenant.id, tenant.daysLeft, tenant.name); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 hover:bg-[var(--success)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <RefreshCcw size={14} /> Perpanjang Lisensi
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateLicenseCode(tenant.id, tenant.name); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/30 hover:bg-[var(--warning)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <Key size={14} /> {tenant.adminCode ? 'Reset Kode Lisensi' : 'Generate Kode Lisensi'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResetSecurity(tenant.id, tenant.name); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--aurora-3)]/10 text-[var(--aurora-3)] border border-[var(--aurora-3)]/30 hover:bg-[var(--aurora-3)]/20 text-xs font-bold tracking-wide transition-all"
                          >
                            <Shield size={14} /> Reset Kode Karyawan
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
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${killCountdown > 0
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
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">{fetchError ? `Gagal memuat data (${fetchError}). Cek koneksi database.` : 'Belum ada tenant. Klik "Tambah Tenant" untuk memulai.'}</p>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6 pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isCreating && setShowCreateModal(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 30 }} 
              className="bg-[#14151A] border border-white/10 rounded-[32px] w-[98%] sm:max-w-lg px-4 pt-4 pb-14 relative z-[210] overflow-y-auto max-h-[85vh] shadow-[0_0_80px_rgba(0,0,0,0.9)] custom-scrollbar"
            >
              <div className="absolute top-3 right-3">
                <button disabled={isCreating} onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="h-14"></div> {/* Top Spacer: Inilah rahasia scroll atas mentok & estetik */}

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--aurora-1)]/20 to-[var(--aurora-3)]/20 flex items-center justify-center text-[var(--aurora-1)] border border-white/5 shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-serif font-bold text-white leading-tight">Onboarding Perusahaan Baru</h3>
                  <p className="text-[8px] sm:text-[10px] text-[var(--aurora-3)] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black mt-0.5 sm:mt-1">Strategic SaaS Expansion</p>
                </div>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1">Nama Resmi Entitas</label>
                  <input required value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} type="text" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-1)] transition-all placeholder:text-gray-700" 
                    placeholder="Masukkan Nama Perusahaan..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1">Tier Subscription</label>
                    <select value={newTenant.tier} onChange={e => setNewTenant({...newTenant, tier: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-1)] transition-all appearance-none">
                      <option value="Bronze">Bronze (Trial)</option><option value="Silver">Silver</option>
                      <option value="Gold">Gold</option><option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black ml-1">Limit User</label>
                    <input type="number" value={newTenant.maxUsers} onChange={e => setNewTenant({...newTenant, maxUsers: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[var(--aurora-1)] transition-all" />
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.15em]">Kode Aktivasi</span>
                    <button type="button" onClick={generateCode} className="text-[8px] text-[var(--aurora-3)] font-black hover:underline tracking-wider">GENERATE</button>
                  </div>

                  {generatedAdminCode ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-3 bg-black/60 rounded-xl border border-[var(--warning)]/40">
                      <span className="text-xs text-[var(--warning)] font-black uppercase tracking-wider mb-1 block">Kode Admin Tenant</span>
                      <span className="text-lg font-mono font-black text-[var(--warning)] tracking-[0.2em]">{generatedAdminCode}</span>
                    </motion.div>
                  ) : null}
                  {generatedCode ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-3 bg-black/60 rounded-xl border border-[var(--aurora-3)]/40">
                      <span className="text-xs text-[var(--aurora-3)] font-black uppercase tracking-wider mb-1 block">Kode Karyawan</span>
                      <span className="text-lg font-mono font-black text-[var(--aurora-3)] tracking-[0.2em]">{generatedCode}</span>
                    </motion.div>
                  ) : (
                    <div className="w-full py-3 bg-white/5 rounded-xl text-center text-[9px] text-gray-600 font-black uppercase tracking-[0.15em] border border-dashed border-white/10">Klik Generate untuk membuat kode</div>
                  )}
                </div>

                <button disabled={isCreating} type="submit" 
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-[var(--aurora-1)] to-[#00C9FF] text-white font-black tracking-[0.2em] uppercase shadow-[0_15px_35px_rgba(142,45,226,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-4">
                  {isCreating ? <><Loader2 size={16} className="animate-spin" /> MEMPROSES...</> : 'AKTIFKAN ENTITAS BARU'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Back to Top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[var(--aurora-3)]/20 border border-[var(--aurora-3)]/40 flex items-center justify-center text-[var(--aurora-3)] shadow-[0_0_15px_rgba(0,201,255,0.4)] animate-pulse"
          >
            <ArrowUp size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SaaSManagement;
