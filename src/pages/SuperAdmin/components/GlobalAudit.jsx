/* eslint-disable i18next/no-literal-string, @shopify/jsx-no-hardcoded-content */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldAlert, Building2, Users, Clock, Filter, Loader2, RefreshCw, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient';

const ActionConfig = {
  PROCESS_PAYROLL: { label: 'Proses Payroll', color: 'var(--success)' },
  APPROVE_LOAN: { label: 'Setujui Pinjaman', color: 'var(--success)' },
  REJECT_LOAN: { label: 'Tolak Pinjaman', color: 'var(--danger)' },
  CREATE_PAYROLL_PERIOD: { label: 'Buat Periode', color: 'var(--aurora-3)' },
  PAY_PAYROLL: { label: 'Bayar Payroll', color: 'var(--warning)' },
  TENANT_ACTIVATED: { label: 'Aktifkan Tenant', color: 'var(--success)' },
  TENANT_DEACTIVATED: { label: 'Nonaktifkan Tenant', color: 'var(--danger)' },
  CREATE_TENANT: { label: 'Buat Tenant', color: 'var(--aurora-1)' },
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

  const getActionConfig = (action) => ActionConfig[action] || { label: action?.replace(/_/g, ' ') || 'Unknown', color: 'gray' };

  const grouped = {};
  filtered.forEach(l => {
    const date = l.created_at?.split('T')[0] || 'unknown';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(l);
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-xl font-serif font-bold text-white">Global Audit Trail</h2>
        <p className="text-sm text-gray-400">Cross-tenant activity monitoring ({filtered.length} events)</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari aksi, user, tenant..." className="w-full bg-[#1A1C23] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[var(--aurora-3)]" />
        </div>
        <select value={filterTenant} onChange={e => { setFilterTenant(e.target.value); }} className="bg-[#1A1C23] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none min-w-[180px]">
          <option value="all">Semua Tenant</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={fetchLogs} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"><RefreshCw size={16} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest"><Activity size={12} className="inline mr-1" /> Total Events</p>
          <p className="text-2xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest"><Users size={12} className="inline mr-1" /> Tenants</p>
          <p className="text-2xl font-bold text-white">{new Set(logs.map(l => l.tenant_id).filter(Boolean)).size}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest"><DollarSign size={12} className="inline mr-1" /> Payroll Events</p>
          <p className="text-2xl font-bold text-[var(--success)]">{logs.filter(l => l.action?.includes('PAYROLL')).length}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest"><ShieldAlert size={12} className="inline mr-1" /> Security Events</p>
          <p className="text-2xl font-bold text-[var(--danger)]">{logs.filter(l => l.action?.includes('ACTIVATE') || l.action?.includes('DEACTIVATE')).length}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto text-[var(--aurora-3)]" /></div>
      ) : (
        <div className="glass-panel p-6">
          <div className="space-y-6">
            {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="text-xs text-gray-600 ml-2">({items.length} events)</span>
                </h3>
                <div className="space-y-1">
                  {items.map(l => {
                    const cfg = getActionConfig(l.action);
                    let details = '';
                    if (l.details) {
                      try { const p = typeof l.details === 'string' ? JSON.parse(l.details) : l.details; details = p.period || p.employee || p.status || ''; } catch { details = l.details; }
                    }
                    return (
                      <div key={l.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                          <Activity size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{cfg.label}</span>
                            <span className="px-2 py-0.5 rounded text-[8px] font-mono" style={{ background: `${l.tenants?.tier === 'Enterprise' ? 'var(--warning)' : 'var(--aurora-3)'}20`, color: l.tenants?.tier === 'Enterprise' ? 'var(--warning)' : 'var(--aurora-3)' }}>{l.tenants?.name || 'System'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-gray-500 mt-0.5">
                            <span>{l.profiles?.full_name || l.profiles?.email || 'System'}</span>
                            {details && <span className="italic">— {typeof details === 'string' ? details.substring(0, 60) : ''}</span>}
                          </div>
                        </div>
                        <span className="text-[9px] text-gray-600 whitespace-nowrap">
                          {new Date(l.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!Object.keys(grouped).length && <p className="text-center text-gray-500 py-8">Belum ada aktivitas</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalAudit;
