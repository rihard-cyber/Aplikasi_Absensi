import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, Building2, Users, Clock, Filter, Loader2, RefreshCw, DollarSign, Activity, ChevronRight } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const t = (s) => s;

const ActionConfig = {
  PROCESS_PAYROLL: { label: t('Proses Payroll'), color: '#00E676', icon: DollarSign },
  APPROVE_LOAN: { label: t('Setujui Pinjaman'), color: '#00E676', icon: DollarSign },
  REJECT_LOAN: { label: t('Tolak Pinjaman'), color: '#FF3D00', icon: DollarSign },
  CREATE_PAYROLL_PERIOD: { label: t('Buat Periode'), color: '#00C9FF', icon: Activity },
  PAY_PAYROLL: { label: t('Bayar Payroll'), color: '#FFD600', icon: DollarSign },
  TENANT_ACTIVATED: { label: t('Aktifkan Tenant'), color: '#00E676', icon: Building2 },
  TENANT_DEACTIVATED: { label: t('Nonaktifkan Tenant'), color: '#FF3D00', icon: Building2 },
  CREATE_TENANT: { label: t('Buat Tenant'), color: '#8E2DE2', icon: Building2 },
};

const GlobalAudit = () => {
  const [logs, setLogs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data: t } = await supabase.from('tenants').select('id, name, tier').order('name');
    if (t) setTenants(t);

    let query = supabase.from('audit_logs')
      .select('*, profiles!user_id(email, full_name), tenants!tenant_id(name, tier)')
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (filterTenant !== 'all') query = query.eq('tenant_id', filterTenant);

    const { data: l } = await query;
    if (l) setLogs(l);
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      return l.action?.toLowerCase().includes(q) || l.profiles?.full_name?.toLowerCase().includes(q) || l.profiles?.email?.toLowerCase().includes(q) || l.tenants?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  const getActionConfig = (action) => Object.prototype.hasOwnProperty.call(ActionConfig, action)
    ? ActionConfig[action]
    : { label: action?.replace(/_/g, ' ') || t('Unknown'), color: '#94A3B8', icon: Activity };

  const grouped = {};
  filtered.forEach(l => {
    const date = l.created_at?.split('T')[0] || 'unknown';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(l);
  });

  const metrics = [
    { label: t('Total Event'), value: logs.length, icon: Activity, color: '#00C9FF', glow: 'rgba(0,201,255,0.4)' },
    { label: t('Tenant Aktif'), value: new Set(logs.map(l => l.tenant_id).filter(Boolean)).size, icon: Building2, color: '#8E2DE2', glow: 'rgba(142,45,226,0.4)' },
    { label: t('Event Payroll'), value: logs.filter(l => l.action?.includes('PAYROLL')).length, icon: DollarSign, color: '#00E676', glow: 'rgba(0,230,118,0.4)' },
    { label: t('Event Keamanan'), value: logs.filter(l => l.action?.includes('ACTIVATE') || l.action?.includes('DEACTIVATE')).length, icon: ShieldAlert, color: '#FF3D00', glow: 'rgba(255,61,0,0.4)' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--aurora-1)]/5 rounded-full blur-[100px] pointer-events-none" />
        <h2 className="text-xl font-serif font-bold text-white mb-1">{t('Global Audit Trail')}</h2>
        <p className="text-sm text-gray-400">{t('Cross-tenant activity monitoring')} ({filtered.length} {t('events')})</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${m.glow}, transparent)` }} />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}15`, color: m.color, boxShadow: `0 0 15px ${m.glow}` }}>
                <m.icon size={18} />
              </div>
            </div>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-1">{m.label}</p>
            <p className="text-2xl font-bold font-serif tracking-tight text-white">{m.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("Cari aksi, user, tenant...")}
            
           className="w-full bg-white/5 backdrop-blur-lg border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none transition-all duration-300 placeholder:text-gray-400 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" />
        </div>
        <select
          value={filterTenant}
          onChange={e => { setFilterTenant(e.target.value); }}
          
         className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-3 text-white text-sm outline-none min-w-[180px] transition-all duration-300 focus:outline-none focus:border-[#00C9FF] focus:ring-2 focus:ring-[#00C9FF]/30 hover:border-white/40" >
           <option value="all">{t('Semua Tenant')}</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          onClick={fetchLogs}
          className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--aurora-3)]/30 to-transparent pointer-events-none" />
          <div className="space-y-6">
            {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-[var(--aurora-3)]" />
                  {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="text-[10px] text-gray-600 font-mono">({items.length} {t('event')})</span>
                </h3>
                <div className="space-y-1">
                  {items.map((l, i) => {
                    const cfg = getActionConfig(l.action);
                    let details = '';
                    if (l.details) {
                      try { const p = typeof l.details === 'string' ? JSON.parse(l.details) : l.details; details = p.period || p.employee || p.status || ''; } catch { details = l.details; }
                    }
                    return (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}15`, color: cfg.color, boxShadow: `0 0 10px ${cfg.color}20` }}>
                          <cfg.icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{cfg.label}</span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
                              style={{
                                background: `${l.tenants?.tier === 'Enterprise' ? 'rgba(255,214,0,0.1)' : 'rgba(0,201,255,0.1)'}`,
                                color: l.tenants?.tier === 'Enterprise' ? '#FFD600' : '#00C9FF',
                                border: `1px solid ${l.tenants?.tier === 'Enterprise' ? 'rgba(255,214,0,0.3)' : 'rgba(0,201,255,0.3)'}`
                              }}
                            >
                              {l.tenants?.name || t('System')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                            <span className="text-gray-400">{l.profiles?.full_name || l.profiles?.email || t('System')}</span>
                            {details && <span className="italic text-gray-600">— {typeof details === 'string' ? details.substring(0, 60) : ''}</span>}
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-600 whitespace-nowrap font-mono flex-shrink-0">
                          {new Date(l.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <ChevronRight size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!Object.keys(grouped).length && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">{t('Belum ada aktivitas yang tercatat.')}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GlobalAudit;
